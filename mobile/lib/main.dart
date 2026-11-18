import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

void main() => runApp(MaterialApp(
  title: 'Flickit',
  theme: ThemeData(colorSchemeSeed: const Color(0xff183d30)),
  home: const Market(),
));

typedef Product = ({String id, String name, String pack, int pricePaise});

Future<List<Product>> loadProducts() async {
  const origin = String.fromEnvironment('API_ORIGIN', defaultValue: 'http://10.0.2.2:4000');
  final response = await http.get(Uri.parse(origin).resolve('/v1/products'))
      .timeout(const Duration(seconds: 6));
  if (response.statusCode != 200) throw StateError('Catalogue unavailable');
  final body = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
  return (body['products'] as List<dynamic>).map((item) => (
    id: item['id'] as String,
    name: item['name'] as String,
    pack: item['pack'] as String,
    pricePaise: item['pricePaise'] as int,
  )).toList();
}

String price(int paise) => '₹${(paise / 100).toStringAsFixed(2)}';

class Market extends StatefulWidget {
  const Market({super.key});

  @override
  State<Market> createState() => _MarketState();
}

class _MarketState extends State<Market> {
  late Future<List<Product>> products = loadProducts();
  final bag = <String, int>{};
  String query = '';
  bool showBag = false;

  @override
  Widget build(BuildContext context) {
    final count = bag.values.fold(0, (sum, quantity) => sum + quantity);
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xfffff9f1),
        title: Image.asset(
          'assets/flickit-logo.png',
          height: 40,
          fit: BoxFit.contain,
          semanticLabel: 'Flickit',
        ),
        actions: [
        TextButton.icon(
          onPressed: () => setState(() => showBag = !showBag),
          icon: Icon(showBag ? Icons.storefront : Icons.shopping_bag_outlined),
          label: Text(showBag ? 'Shop' : 'Bag ($count)'),
        ),
      ]),
      body: SafeArea(
        child: FutureBuilder<List<Product>>(
          future: products,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: TextButton(
                onPressed: () => setState(() => products = loadProducts()),
                child: const Text('Couldn’t load groceries. Try again'),
              ));
            }
            final catalogue = snapshot.requireData;
            final visible = catalogue.where((product) => showBag
                ? bag.containsKey(product.id)
                : product.name.toLowerCase().contains(query.trim().toLowerCase())).toList();
            final total = visible.fold(0, (sum, product) =>
                sum + product.pricePaise * (bag[product.id] ?? 0));
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(showBag ? 'Your bag' : 'Everyday groceries',
                    style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 12),
                if (!showBag) TextFormField(
                  initialValue: query,
                  onChanged: (value) => setState(() => query = value),
                  decoration: const InputDecoration(
                    labelText: 'Search groceries',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(),
                  ),
                ),
                if (visible.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Text(showBag ? 'Your bag is empty.' : 'No groceries found.'),
                  ),
                for (final product in visible)
                  Card(child: ListTile(
                    title: Text(product.name),
                    subtitle: Text(showBag
                        ? '${bag[product.id]} × ${price(product.pricePaise)}'
                        : '${product.pack} · ${price(product.pricePaise)}'),
                    trailing: showBag
                        ? IconButton(
                            tooltip: 'Remove one ${product.name}',
                            icon: const Icon(Icons.remove_circle_outline),
                            onPressed: () => setState(() {
                              final quantity = bag[product.id]!;
                              if (quantity == 1) {
                                bag.remove(product.id);
                              } else {
                                bag[product.id] = quantity - 1;
                              }
                            }),
                          )
                        : FilledButton.tonal(
                            onPressed: () => setState(() => bag.update(
                              product.id, (quantity) => quantity + 1, ifAbsent: () => 1,
                            )),
                            child: const Text('Add'),
                          ),
                  )),
                if (showBag && visible.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text('Subtotal ${price(total)}'),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
