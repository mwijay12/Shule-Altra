/// Saved school schedules, read explicitly and never written by this pilot.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/saved_timetable.dart';
import '../data/school_gateway.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../format.dart';

class SavedTimetableScreen extends StatefulWidget {
  const SavedTimetableScreen({super.key, required this.session, required this.reader});
  final AppSession session;
  final TimetableReader reader;

  @override
  State<SavedTimetableScreen> createState() => _SavedTimetableScreenState();
}

class _SavedTimetableScreenState extends State<SavedTimetableScreen> {
  String _className = timetableClasses.first;
  String _stream = timetableStreams.first;
  String _day = timetableDays.first;
  String? _uid;
  late int _revision;
  DateTime? _readAt;
  SavedTimetable? _schedule;
  String? _error;
  bool _loading = false;
  bool _loaded = false;
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _uid = widget.session.uid;
    _revision = widget.session.dataRevision;
    widget.session.addListener(_sessionChanged);
  }

  @override
  void dispose() {
    widget.session.removeListener(_sessionChanged);
    super.dispose();
  }

  void _clear() {
    _generation++;
    _schedule = null;
    _readAt = null;
    _error = null;
    _loading = false;
    _loaded = false;
  }

  void _sessionChanged() {
    if (_uid != widget.session.uid || _revision != widget.session.dataRevision) {
      setState(() {
        _uid = widget.session.uid;
        _revision = widget.session.dataRevision;
        _clear();
      });
    }
  }

  Future<void> _load() async {
    final uid = widget.session.uid;
    if (uid == null) return;
    final generation = ++_generation;
    final revision = widget.session.dataRevision;
    final className = _className;
    final stream = _stream;
    setState(() { _loading = true; _loaded = false; _schedule = null; _readAt = null; _error = null; });
    try {
      final value = await widget.reader.loadTimetable(className, stream);
      if (!mounted || generation != _generation || revision != widget.session.dataRevision || uid != widget.session.uid) return;
      setState(() { _schedule = value; _loaded = true; _readAt = DateTime.now(); });
    } on GatewayFailure catch (error) {
      if (!mounted || generation != _generation || revision != widget.session.dataRevision || uid != widget.session.uid) return;
      setState(() => _error = error.message);
    } catch (_) {
      if (!mounted || generation != _generation || revision != widget.session.dataRevision || uid != widget.session.uid) return;
      setState(() => _error = 'The timetable could not be read. Check the connection and try again.');
    } finally {
      if (mounted && generation == _generation && revision == widget.session.dataRevision && uid == widget.session.uid) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final schedule = _schedule;
    return Scaffold(
      appBar: AppBar(title: const Text('School timetable')),
      body: ListView(padding: const EdgeInsets.all(Space.gutter), children: [
        const Notice(title: 'Saved school schedule · read-only',
          body: 'Online server read. Reload to see newer changes; school permissions apply.'),
        const SizedBox(height: Space.lg),
        if (_uid == null)
          const Notice(title: 'Sign in required', body: 'Return to Learners and sign in to read your school timetable.')
        else ...[
          DropdownButtonFormField<String>(
            value: _className, isExpanded: true,
            decoration: const InputDecoration(labelText: 'Class'),
            items: timetableClasses.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
            onChanged: (value) { if (value != null) setState(() { _className = value; _clear(); }); },
          ),
          const SizedBox(height: Space.md),
          DropdownButtonFormField<String>(
            value: _stream, isExpanded: true,
            decoration: const InputDecoration(labelText: 'Stream'),
            items: timetableStreams.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
            onChanged: (value) { if (value != null) setState(() { _stream = value; _clear(); }); },
          ),
          const SizedBox(height: Space.md),
          DropdownButtonFormField<String>(
            value: _day, isExpanded: true,
            decoration: const InputDecoration(labelText: 'Day'),
            items: timetableDays.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
            onChanged: (value) { if (value != null) setState(() => _day = value); },
          ),
          const SizedBox(height: Space.md),
          FilledButton.icon(onPressed: _loading ? null : _load, icon: const Icon(Icons.refresh), label: const Text('Load timetable')),
          const SizedBox(height: Space.md),
          if (_loading) const Center(child: CircularProgressIndicator())
          else if (_error != null) Notice(title: 'Could not load timetable', body: _error!, tone: NoticeTone.danger)
          else if (_loaded && schedule == null) const Notice(title: 'No saved schedule', body: 'No schedule was found for this class and stream.')
          else if (schedule == null) const Text('Choose a class and stream, then load its saved timetable. Changing the day does not require another read.')
          else ...[
            ShuleCard(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$_day · $_className $_stream', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: Space.xs),
                Text('Read from the server at ${timeStamp(_readAt!)} · reload for newer changes',
                    style: Theme.of(context).textTheme.bodySmall),
              ],
            )),
            const SizedBox(height: Space.sm),
            for (final period in timetablePeriods)
              Builder(builder: (context) {
                final slot = period.isBreak ? null : schedule.slot(_day, period.id);
                final title = period.isBreak ? period.label :
                    (slot?.subject.trim().isNotEmpty == true ? slot!.subject : 'Not scheduled');
                final detail = slot == null ? '' : [slot.teacher, slot.room].where((value) => value.trim().isNotEmpty).join(' · ');
                return Card(child: ListTile(
                  leading: Icon(period.isBreak ? Icons.free_breakfast_outlined : Icons.menu_book_outlined),
                  title: Text(title),
                  subtitle: Text('${period.label} · ${period.time}${detail.isEmpty ? '' : ' · $detail'}'),
                ));
              }),
          ],
        ],
      ]),
    );
  }
}
